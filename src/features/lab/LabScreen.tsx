'use client';

import {
  Brush,
  FileText,
  FolderOpen,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Play,
  Save,
  ScanSearch,
  Share2,
  Square as SquareIcon,
  Target,
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PromotionPicker } from '@/components/board/BoardExtras';
import { ChessBoard } from '@/components/board/ChessBoard';
import { NightPanel, PlayScreen } from '@/components/layout/PlayScreen';
import { Button, IconButton } from '@/components/ui/Button';
import { cn } from '@/components/ui/cn';
import { Sheet } from '@/components/ui/Sheet';
import { buildCustomChallenge } from '@/core/challenges';
import { applyStroke, hasAnnotations } from '@/core/chess/annotations';
import { boardToFen, checkPosition } from '@/core/chess/fen';
import {
  EMPTY_FEN,
  NO_ANNOTATIONS,
  START_FEN,
  type Annotations,
  type MarkColor,
  type MoveInput,
  type Square,
} from '@/core/chess/types';
import type { SavedPosition } from '@/core/domain/types';
import { useBoardInput } from '@/hooks/useBoardInput';
import { useSound } from '@/hooks/useSound';
import { decodeSharedPosition, sharedPositionPath, shareLink, type SharedPosition } from '@/services/share';
import { uid } from '@/services/storage';
import { findPosition, useLabStore } from '@/stores/lab';
import { useProgressStore } from '@/stores/progress';
import { useSessionStore } from '@/stores/session';
import { useSettingsStore } from '@/stores/settings';
import { AnalysisNav, BestLine, EvalSummary } from './AnalysisPanel';
import { EditorToolbar, MarkPalette, PiecePalette } from './EditorTools';
import { ChallengeSheet, FenSheet, PlayFromHereSheet, PositionsSheet, SaveSheet } from './LabSheets';
import { useAnalysis } from './useAnalysis';
import { editorStateFromFen, useEditor, type Tool } from './useEditor';

type Mode = 'edit' | 'analyze';
type SheetName = 'start' | 'menu' | 'save' | 'positions' | 'fen' | 'play' | 'challenge' | null;
type Loadable = Pick<SavedPosition, 'name' | 'description' | 'fen' | 'annotations' | 'moves'> & { id?: string; source?: string };

const MODES: { value: Mode; label: string; icon: typeof Pencil }[] = [
  { value: 'edit', label: 'Montar', icon: Pencil },
  { value: 'analyze', label: 'Analisar', icon: ScanSearch },
];

/**
 * Laboratório de Xadrez: criação + análise + treino sobre o mesmo ChessBoard
 * das outras telas.
 *  - Montar: editor livre de posições (peças, turno, marcações, desfazer).
 *  - Analisar: lances livres com a avaliação e a melhor linha da engine.
 */
export function LabScreen() {
  const params = useSearchParams();
  const editor = useEditor();
  const { state } = editor;
  const user = useSessionStore((s) => s.user);
  const showCoords = useSettingsStore((s) => s.showCoords);
  const savedPositions = useLabStore((s) => s.positions);
  const savePosition = useLabStore((s) => s.savePosition);
  const addChallenge = useLabStore((s) => s.addChallenge);
  const recordPositionSaved = useProgressStore((s) => s.recordPositionSaved);
  const { playMove } = useSound();

  const [mode, setMode] = useState<Mode>('edit');
  const [tool, setTool] = useState<Tool>({ kind: 'move' });
  const [toolTab, setToolTab] = useState<'pieces' | 'marks'>('pieces');
  const [markColor, setMarkColor] = useState<MarkColor | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ id?: string; name: string; description: string }>({ name: '', description: '' });

  // análise
  const [analysisFen, setAnalysisFen] = useState<string | null>(null);
  const [analysisMoves, setAnalysisMoves] = useState<string[]>([]);
  const [engineOn, setEngineOn] = useState(true);
  const [analysisMarks, setAnalysisMarks] = useState<Annotations>(NO_ANNOTATIONS);
  const analysis = useAnalysis(analysisFen, engineOn && mode === 'analyze', analysisMoves);

  const fen = useMemo(() => boardToFen(state.board, state.turn), [state.board, state.turn]);
  const editing = mode === 'edit';
  const marking = editing ? toolTab === 'marks' && markColor !== null : markColor !== null;

  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(id);
  }, [toast]);

  // qualquer edição limpa os avisos de posição inválida
  useEffect(() => {
    setErrors([]);
    setSelected(null);
  }, [state.board, state.turn]);

  // ───────────── abrir posições ─────────────

  const loadPosition = useCallback(
    (p: Loadable) => {
      const next = editorStateFromFen(p.fen, p.annotations);
      editor.replace(next);
      setMeta({ id: p.source === 'user' ? p.id : undefined, name: p.name, description: p.description });
      setMarkColor(null);
      setTool({ kind: 'move' });
      const check = checkPosition(next.board, next.turn, { allowFinished: true });
      if (check.ok) {
        setAnalysisMoves(p.moves);
        setAnalysisFen(check.fen);
        setMode('analyze');
      } else {
        setMode('edit');
      }
    },
    [editor],
  );

  // Entrada: ?pos=<id> (posição salva), ?p=<código> (link ou prática de aula) ou escolha inicial.
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const saved = findPosition(savedPositions, params.get('pos'));
    if (saved) return loadPosition(saved);
    const code = params.get('p');
    const shared = code ? decodeSharedPosition(code) : null;
    if (shared) return loadPosition({ ...shared, moves: [] });
    setSheet('start');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───────────── trocar de modo ─────────────

  const enterAnalysis = useCallback(() => {
    const check = checkPosition(state.board, state.turn, { allowFinished: true });
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    if (check.fen !== analysisFen) {
      setAnalysisMoves([]);
      setAnalysisFen(check.fen);
    }
    setMarkColor(null);
    setMode('analyze');
  }, [state.board, state.turn, analysisFen]);

  const enterEdit = () => {
    setMarkColor(null);
    setToolTab('pieces');
    setMode('edit');
  };

  const openPlay = () => {
    const check = checkPosition(state.board, state.turn);
    if (!check.ok) return setErrors(check.errors);
    setSheet('play');
  };

  /** Na análise, "jogar daqui" e "editar" usam a posição que está no tabuleiro agora. */
  const adoptAnalysisPosition = useCallback(() => {
    if (!analysis.fen || analysis.cursor === 0 || analysis.fen === fen) return;
    editor.replace(editorStateFromFen(analysis.fen));
  }, [analysis.fen, analysis.cursor, fen, editor]);

  // ───────────── tabuleiro: edição ─────────────

  const onEditClick = (square: Square) => {
    if (tool.kind === 'piece') return editor.placePiece(square, tool.code);
    if (tool.kind === 'erase') return editor.removePiece(square);
    if (selected && selected !== square) {
      editor.movePiece(selected, square);
      return setSelected(null);
    }
    setSelected(state.board[square] && selected !== square ? square : null);
  };

  // ───────────── tabuleiro: análise ─────────────

  // as marcações da posição aparecem no início da análise e somem quando se joga
  useEffect(() => {
    setAnalysisMarks(analysis.fen === analysisFen ? state.annotations : NO_ANNOTATIONS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis.fen, analysisFen]);

  const onAnalysisMove = useCallback(
    (input: MoveInput) => {
      const record = analysis.move(input);
      if (record) playMove(record);
    },
    [analysis, playMove],
  );

  const input = useBoardInput({
    board: analysis.snapshot?.board ?? state.board,
    movable: mode === 'analyze' && !marking && analysis.snapshot?.status === 'playing' ? analysis.snapshot.turn : null,
    getTargets: (sq) => analysis.position?.legalTargets(sq) ?? [],
    needsPromotion: (from, to) => analysis.position?.needsPromotion(from, to) ?? false,
    onMove: onAnalysisMove,
  });

  const analysisAnnotations = useMemo<Annotations>(() => {
    const best = engineOn && !marking ? analysis.bestLine?.firstMove : null;
    if (!best) return analysisMarks;
    return { ...analysisMarks, arrows: [...analysisMarks.arrows, { from: best.from, to: best.to, color: 'idea' }] };
  }, [analysisMarks, analysis.bestLine, engineOn, marking]);

  // ───────────── salvar, compartilhar, desafio ─────────────

  const currentPayload = (): SharedPosition => ({
    name: meta.name || 'Posição',
    description: meta.description,
    fen,
    annotations: state.annotations,
  });

  const save = (name: string, description: string, asCopy: boolean) => {
    const isNew = asCopy || !meta.id;
    const saved = savePosition({
      id: isNew ? undefined : meta.id,
      name,
      description,
      fen,
      annotations: state.annotations,
      moves: analysisFen === fen ? analysis.line.map((m) => m.san) : [],
    });
    if (isNew) recordPositionSaved();
    setMeta({ id: saved.id, name: saved.name, description: saved.description });
    setSheet(null);
    notify('Posição salva.');
  };

  const share = async (payload: SharedPosition) => {
    const url = `${window.location.origin}${sharedPositionPath(payload)}`;
    const result = await shareLink(url, payload.name);
    if (result === 'copied') notify('Link copiado.');
    if (result === 'failed') notify('Não deu pra copiar o link.');
  };

  const createChallenge = (title: string, prompt: string) => {
    if (!analysisFen) return;
    const built = buildCustomChallenge(
      { title, prompt, fen: analysisFen, solution: analysis.sans, authorName: user?.name ?? 'Jogador' },
      uid('desafio_'),
    );
    setSheet(null);
    if ('error' in built) return notify(built.error);
    addChallenge(built);
    notify('Desafio criado. Ele já está em Desafios.');
  };

  const start = (startFen: string) => {
    editor.replace(editorStateFromFen(startFen));
    setMeta({ name: '', description: '' });
    setAnalysisFen(null);
    setMode('edit');
    setSheet(null);
  };

  const menuItems: { icon: typeof Save; label: string; hint?: string; onClick: () => void }[] = [
    { icon: Save, label: 'Salvar posição', onClick: () => setSheet('save') },
    { icon: FolderOpen, label: 'Minhas posições', onClick: () => setSheet('positions') },
    { icon: FileText, label: 'Importar / exportar FEN', onClick: () => setSheet('fen') },
    {
      icon: Share2,
      label: 'Compartilhar posição',
      hint: 'Gera um link com esta posição',
      onClick: () => {
        setSheet(null);
        void share(currentPayload());
      },
    },
    {
      icon: Target,
      label: 'Transformar em desafio',
      hint: 'Use os lances jogados na análise como solução',
      onClick: () => setSheet('challenge'),
    },
    { icon: LayoutGrid, label: 'Nova posição', onClick: () => setSheet('start') },
  ];

  const orientation = flipped ? 'b' : 'w';
  const firstColor = analysisFen?.split(' ')[1] === 'b' ? 'b' : 'w';

  return (
    <PlayScreen
      title={meta.name || 'Laboratório'}
      kicker={meta.name ? 'Laboratório' : 'Monte e analise'}
      backHref="/"
      chrome={318}
      actions={
        <>
          <IconButton label="Salvar posição" tone="night" onClick={() => setSheet('save')}>
            <Save size={20} />
          </IconButton>
          <IconButton label="Mais opções" tone="night" onClick={() => setSheet('menu')}>
            <MoreVertical size={20} />
          </IconButton>
        </>
      }
    >
      {/* modos */}
      <div role="tablist" aria-label="Modo do laboratório" className="grid grid-cols-2 gap-1 rounded-2xl bg-white/[0.07] p-1">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={mode === m.value}
            onClick={() => (m.value === 'analyze' ? enterAnalysis() : enterEdit())}
            className={cn(
              'flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-bold',
              mode === m.value ? 'bg-lime text-night' : 'text-paper/75',
            )}
          >
            <m.icon size={16} />
            {m.label}
          </button>
        ))}
      </div>

      <div className="play-board">
        {mode === 'analyze' && analysis.snapshot ? (
          <ChessBoard
            board={analysis.snapshot.board}
            orientation={orientation}
            lastMove={analysis.lastMove}
            checkSquare={analysis.snapshot.checkSquare}
            annotations={analysisAnnotations}
            showCoords={showCoords}
            {...input.boardProps}
            onStroke={marking && markColor ? (f, t) => setAnalysisMarks((a) => applyStroke(a, f, t, markColor)) : undefined}
          />
        ) : (
          <ChessBoard
            board={state.board}
            orientation={orientation}
            annotations={state.annotations}
            showCoords={showCoords}
            selected={selected}
            onSquareClick={onEditClick}
            onPieceDrop={editor.movePiece}
            onDragStart={() => setSelected(null)}
            onStroke={marking && markColor ? (f, t) => editor.stroke(f, t, markColor) : undefined}
          />
        )}
      </div>

      {errors.length > 0 && (
        <div role="alert" className="rounded-2xl bg-danger/20 p-3 text-sm text-paper ring-1 ring-danger/50">
          <p className="font-bold">Essa posição ainda não pode ser jogada:</p>
          <ul className="mt-1 list-disc pl-5 text-paper/85">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ───────────── Montar ───────────── */}
      {editing && (
        <>
          <EditorToolbar editor={editor} flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/[0.07] p-1">
            {(
              [
                ['pieces', 'Peças', SquareIcon],
                ['marks', 'Setas e marcações', Brush],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={toolTab === value}
                onClick={() => {
                  setToolTab(value);
                  if (value === 'marks' && !markColor) setMarkColor('good');
                }}
                className={cn(
                  'flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-xs font-bold',
                  toolTab === value ? 'bg-white/20 text-paper' : 'text-paper/60',
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>
          {toolTab === 'pieces' ? (
            <PiecePalette tool={tool} onTool={setTool} />
          ) : (
            <MarkPalette
              color={markColor}
              onColor={setMarkColor}
              onClear={editor.clearMarks}
              canClear={hasAnnotations(state.annotations)}
            />
          )}
          <div className="flex gap-2">
            <Button variant="dark" size="sm" className="flex-1 gap-1.5 bg-white/10" icon={<ScanSearch size={17} />} onClick={enterAnalysis}>
              Analisar
            </Button>
            <Button variant="lime" size="sm" className="flex-1 gap-1.5" icon={<Play size={16} fill="currentColor" />} onClick={openPlay}>
              Jogar daqui
            </Button>
          </div>
        </>
      )}

      {/* ───────────── Analisar ───────────── */}
      {mode === 'analyze' && (
        <>
          <EvalSummary analysis={analysis} engineOn={engineOn} onToggle={() => setEngineOn((v) => !v)} />
          {engineOn && <BestLine analysis={analysis} onPlay={onAnalysisMove} />}
          <AnalysisNav analysis={analysis} firstColor={firstColor} />
          <NightPanel>
            <MarkPalette
              color={markColor}
              onColor={setMarkColor}
              onClear={() => setAnalysisMarks(NO_ANNOTATIONS)}
              canClear={hasAnnotations(analysisMarks)}
            />
          </NightPanel>
          <div className="flex gap-2">
            <Button
              variant="dark"
              size="sm"
              className="flex-1 gap-1.5 bg-white/10"
              icon={<Pencil size={16} />}
              onClick={() => {
                adoptAnalysisPosition();
                enterEdit();
              }}
            >
              Editar
            </Button>
            <Button
              variant="lime"
              size="sm"
              className="flex-1 gap-1.5"
              icon={<Play size={16} fill="currentColor" />}
              onClick={() => {
                adoptAnalysisPosition();
                // a validação usa a posição da análise: o editor só atualiza no próximo render
                const target = analysis.fen && analysis.cursor > 0 ? editorStateFromFen(analysis.fen) : state;
                const check = checkPosition(target.board, target.turn);
                if (!check.ok) return setErrors(check.errors);
                setSheet('play');
              }}
            >
              Jogar daqui
            </Button>
          </div>
        </>
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4" role="status">
          <span className="animate-rise rounded-full bg-paper px-5 py-3 text-sm font-bold text-night shadow-xl">{toast}</span>
        </div>
      )}

      {/* ───────────── folhas ───────────── */}
      <Sheet open={sheet === 'start'} onClose={() => setSheet(null)} title="Como quer começar?">
        <div className="space-y-2">
          <StartOption title="Posição inicial" text="Todas as peças no lugar." onClick={() => start(START_FEN)} />
          <StartOption title="Tabuleiro vazio" text="Coloque só as peças que quiser." onClick={() => start(EMPTY_FEN)} />
          <StartOption
            title="Minhas posições"
            text={savedPositions.length ? `${savedPositions.length} salvas, mais as da Liga X.` : 'Posições salvas e as da Liga X.'}
            onClick={() => setSheet('positions')}
          />
        </div>
      </Sheet>

      <Sheet open={sheet === 'menu'} onClose={() => setSheet(null)} title="Laboratório">
        <ul className="-mx-2">
          {menuItems.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={item.onClick}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl px-2 text-left active:bg-black/5"
              >
                <item.icon size={20} className="shrink-0 text-brand-deep" />
                <span>
                  <span className="block font-bold text-ink">{item.label}</span>
                  {item.hint && <span className="block text-xs text-mute">{item.hint}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>

      <SaveSheet
        open={sheet === 'save'}
        onClose={() => setSheet(null)}
        initialName={meta.name}
        initialDescription={meta.description}
        isUpdate={!!meta.id}
        onSave={save}
      />
      <PositionsSheet
        open={sheet === 'positions'}
        onClose={() => setSheet(null)}
        onOpen={(p) => {
          loadPosition(p);
          setSheet(null);
        }}
        onShare={(p) => void share(p)}
      />
      <FenSheet
        open={sheet === 'fen'}
        onClose={() => setSheet(null)}
        fen={mode === 'analyze' && analysis.fen ? analysis.fen : fen}
        onCopied={() => notify('FEN copiado.')}
        onImport={(board, turn) => {
          editor.replace({ board, turn, annotations: NO_ANNOTATIONS });
          setMeta({ name: '', description: '' });
          setMode('edit');
          setSheet(null);
          notify('Posição carregada.');
        }}
      />
      <PlayFromHereSheet
        open={sheet === 'play'}
        onClose={() => setSheet(null)}
        fen={mode === 'analyze' && analysis.fen ? analysis.fen : fen}
        sideToMove={mode === 'analyze' && analysis.snapshot ? analysis.snapshot.turn : state.turn}
      />
      <ChallengeSheet
        open={sheet === 'challenge'}
        onClose={() => setSheet(null)}
        solution={mode === 'analyze' ? analysis.sans : []}
        onCreate={createChallenge}
      />

      <PromotionPicker
        color={input.promotion?.color ?? null}
        onChoose={input.choosePromotion}
        onCancel={input.cancelPromotion}
      />
    </PlayScreen>
  );
}

function StartOption({ title, text, onClick }: { title: string; text: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-16 w-full flex-col justify-center rounded-2xl bg-card px-4 py-3 text-left active:bg-lime/20">
      <span className="font-bold text-ink">{title}</span>
      <span className="text-sm text-mute">{text}</span>
    </button>
  );
}
