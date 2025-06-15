import { BadRequestException, Injectable } from '@nestjs/common';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly prismaService: PrismaService, private jwtService: JwtService) { }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    try {
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });
      if (!user) throw new BadRequestException('Contraseña o email incorrecto');

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        throw new BadRequestException('Contraseña o email incorrecto');
      }

      const { password: _, ...userWithoutPassword } = user;

      const payload = {
        ...userWithoutPassword,
      }

      const authToken = await this.jwtService.signAsync(payload)

      return { authToken, role: user.role };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
    }
  }

  async getUsers() {
    return await this.prismaService.user.findMany();
  }

  async register(registerDto: RegisterDto) {
    const { name, email, password } = registerDto;
    const passwordHashed = await bcrypt.hash(password, 10);
    try {
      const userFound = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (userFound) throw new BadRequestException('El usuario ya existe');

      const user = await this.prismaService.user.create({
        data: {
          name,
          email,
          role: "user",
          password: passwordHashed,
        },
      });

      const { password: _, ...userWithoutPassword } = user;

      const payload = {
        ...userWithoutPassword,
      }

      const authToken = await this.jwtService.signAsync(payload)      

      return { authToken, role: user.role };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new Error(error);
    }

  }
}
