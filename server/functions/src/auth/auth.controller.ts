import { Controller, Post, Body, Get, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, UpdateProfileDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { AdminOnly, Authenticated } from './admin.guard';
import { GetUser } from './get-user.decorator';
import { AuthUser } from './auth-user.interface';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('login')
    login(@Body() loginDto: LoginDto) {
        return this.authService.login(loginDto);
    }

    @Post('register')
    register(@Body() registerDto: RegisterDto) {
        return this.authService.register(registerDto);
    }

    @Get('me')
    @Authenticated()
    me(@GetUser() user: AuthUser) {
        return this.authService.getProfile(user.id);
    }

    @Patch('me')
    @Authenticated()
    updateMe(@GetUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
        return this.authService.updateProfile(user.id, dto);
    }

    @Get('get-users')
    @AdminOnly()
    getUsers() {
        return this.authService.getUsers();
    }
}
