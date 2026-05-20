interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: Date;
}

type UserPatch = Partial<Pick<User, 'name' | 'email' | 'role'>>;

class UserService {
  private readonly users = new Map<number, User>();
  private nextId = 1;

  /**
   * Creates a new user and returns it.
   * @param data - The user fields (without `id` and `createdAt`).
   */
  create(data: Omit<User, 'id' | 'createdAt'>): User {
    const user: User = {
      ...data,
      id: this.nextId++,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  findById(id: number): User | undefined {
    return this.users.get(id);
  }

  update(id: number, patch: UserPatch): User {
    const user = this.users.get(id);
    if (!user) throw new Error(`User ${id} not found`);
    const updated = { ...user, ...patch };
    this.users.set(id, updated);
    return updated;
  }

  list(role?: User['role']): User[] {
    const all = [...this.users.values()];
    return role ? all.filter((u) => u.role === role) : all;
  }
}

// Generic result wrapper with discriminated union
type Result<T, E extends Error = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

async function fetchUser(id: number): Promise<Result<User>> {
  try {
    const res = await fetch(`/api/users/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { ok: true, value: await res.json() };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}

export { UserService, fetchUser };
export type { User, UserPatch, Result };
