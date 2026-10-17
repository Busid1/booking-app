import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail({}, { message: 'El email no es válido' })
    email: string;

    @IsString()
    @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
    @MaxLength(72)
    password: string;

    @IsString()
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    @MaxLength(80)
    name: string;
}
