import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { AuthUser } from './auth-user.interface';

const publicUserSelect = { id: true, email: true, name: true, role: true, createdAt: true };

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService, private jwtService: JwtService) { }

  private async buildSession(user: AuthUser) {
    const payload: AuthUser = { id: user.id, email: user.email, name: user.name, role: user.role };
    const authToken = await this.jwtService.signAsync(payload);
    return { authToken, role: user.role, user: payload };
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.trim().toLowerCase();
    const user = await this.prismaService.user.findUnique({ where: { email } });

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    return this.buildSession(user);
  }

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.trim().toLowerCase();
    const name = registerDto.name.trim();

    const userFound = await this.prismaService.user.findUnique({ where: { email } });
    if (userFound) throw new ConflictException('Ya existe una cuenta con ese email');

    const user = await this.prismaService.user.create({
      data: {
        name,
        email,
        role: 'user',
        password: await bcrypt.hash(registerDto.password, 10),
      },
    });

    return this.buildSession(user);
  }

  async getUsers() {
    return this.prismaService.user.findMany({ select: publicUserSelect, orderBy: { createdAt: 'desc' } });
  }

  async getProfile(userId: string) {
    const user = await this.prismaService.user.findUnique({ where: { id: userId }, select: publicUserSelect });
    if (!user) throw new UnauthorizedException('Sesión no válida');
    return user;
  }
}
