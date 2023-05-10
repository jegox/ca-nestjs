import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 200, unique: true })
  email: string;

  @Column({ length: 200 })
  password: string;

  @Column({
    length: 200,
    transformer: {
      to: (value: string) => value.toUpperCase(),
      from: (value: string) => value,
    },
  })
  fullname: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
