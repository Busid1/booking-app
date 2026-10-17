import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf } from 'class-validator';

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

    @IsOptional()
    @ValidateIf((_o, v) => v !== '' && v !== null)
    @Matches(/^\+?[0-9\s().-]{6,20}$/, { message: 'El teléfono no es válido' })
    phone?: string;
}

export class UpdateProfileDto {
    @IsString()
    @IsNotEmpty({ message: 'El nombre es obligatorio' })
    @MaxLength(80)
    name: string;

    @IsOptional()
    @ValidateIf((_o, v) => v !== '' && v !== null)
    @Matches(/^\+?[0-9\s().-]{6,20}$/, { message: 'El teléfono no es válido' })
    phone?: string;
}
