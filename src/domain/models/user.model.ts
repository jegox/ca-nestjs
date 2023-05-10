export class UserModel {
  id: string;
  fullname: string;
  email: string;
  password: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserAuthenticated {
  fullname: string;
  email: string;
  token: string;
}
