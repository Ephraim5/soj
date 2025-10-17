export interface User {
    id: number;
    name: string;
    role: 'Super Admin' | 'Unit Leader';
    image: string;
    unit: string;
}
export interface UserL {
    id: number;
    name: string;
    role: 'Unit Member' | 'Unit Leader';
    image: string;
    unit: string;
}

export type RootStackParamList = {
    MoreOptions: undefined;
    ManageSuperAdminsUnitLeaders: undefined;
    Dashboard: { ProfileAdminImage?: string };
    More: undefined;
};