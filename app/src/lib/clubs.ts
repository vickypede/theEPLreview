import type { Club } from '@/types';

export function isCurrentPremierLeagueClub(club: Pick<Club, 'isCurrentPremierLeague'>) {
  return club.isCurrentPremierLeague === true;
}

type ClubSortShape = Pick<Club, 'name'> & { isTop6?: boolean };

export function sortClubsByPriorityThenName(a: ClubSortShape, b: ClubSortShape) {
  if (a.isTop6 !== b.isTop6) return a.isTop6 ? -1 : 1;
  return a.name.localeCompare(b.name);
}
