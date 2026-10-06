'use client';

import { useParams } from 'next/navigation';
import { FriendMatchScreen } from '@/features/friends/FriendMatchScreen';

export default function AmigoMatchPage() {
  const { id } = useParams<{ id: string }>();
  return <FriendMatchScreen key={id} id={id.toUpperCase()} />;
}
