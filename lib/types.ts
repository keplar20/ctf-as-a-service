export type Role = "admin" | "organizer" | "participant";

export type Category = "web" | "crypto" | "forensics" | "pwn" | "misc";
export type Difficulty = "easy" | "medium" | "hard";
export type ChallengeType = "static" | "dynamic";

export const CATEGORIES: Category[] = ["web", "crypto", "forensics", "pwn", "misc"];
export const DIFFICULTIES: Difficulty[] = ["easy", "medium", "hard"];
export const TYPES: ChallengeType[] = ["static", "dynamic"];

export type Profile = {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  event_quota: number;
  created_at: string;
};

export type Challenge = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  points: number;
  type: ChallengeType;
  flag: string;
  file_url: string | null;
  image: string | null;
  container_port: number | null;
  is_active: boolean;
  created_at: string;
};

export type InstanceStatus = "starting" | "running" | "stopped" | "error";

export type Instance = {
  id: string;
  event_id: string;
  team_id: string;
  challenge_id: string;
  status: InstanceStatus;
  container_id: string | null;
  network_name: string | null;
  host: string | null;
  flag: string;
  error_msg: string | null;
  started_at: string;
  stopped_at: string | null;
  expires_at: string;
};

export type Event = {
  id: string;
  organizer_id: string;
  name: string;
  description: string | null;
  invite_code: string;
  starts_at: string | null;
  ends_at: string | null;
  flag_prefix: string;
  is_active: boolean;
  created_at: string;
};

export type Team = {
  id: string;
  event_id: string;
  name: string;
  invite_code: string;
  created_at: string;
};

export type ScoreboardRow = {
  team_id: string;
  event_id: string;
  team_name: string;
  total_points: number;
  solves: number;
  last_solve_at: string | null;
};
