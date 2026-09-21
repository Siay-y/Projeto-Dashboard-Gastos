/** Perfil mínimo do usuário — sem login, apenas identificação local. */
export interface UserProfile {
  name: string;
  /** ISO 8601 — quando o usuário se identificou pela primeira vez. */
  createdAt: string;
}
