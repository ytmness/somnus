export type PublicProfile = {
  id: string;
  name: string;
  avatarUrl: string | null;
  backgroundUrl: string | null;
  bio: string | null;
  instagramUsername: string | null;
  emailVerified: boolean;
  createdAt: string;
  stats: {
    communities: number;
    pastEvents: number;
    completedPurchases: number;
  };
  communities: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
  }>;
  pastEvents: Array<{
    id: string;
    name: string;
    eventDate: string;
    imageUrl: string | null;
    organizationLogo: string | null;
  }>;
};

export type PrivateProfile = PublicProfile & {
  email: string;
  phone: string | null;
  smsOptIn: boolean;
  isOwn: true;
};

export type BuyerProfileCard = {
  hasAccount: boolean;
  userId: string | null;
  name: string | null;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  bio: string | null;
  instagramUsername: string | null;
  emailVerified: boolean;
  smsOptIn: boolean;
  memberSince: string | null;
  completedPurchases: number;
  communities: number;
};
