import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, ValidateIf } from 'class-validator';

const SOCIAL = { message: 'El enlace o usuario no es válido' };

export class BusinessInfoDto {
    @IsString()
    @MaxLength(100)
    name: string;

    @IsString()
    @MaxLength(2000)
    description: string;

    @IsString()
    @MaxLength(200)
    address: string;

    @IsString()
    @MaxLength(40)
    phone: string;

    @IsString()
    @MaxLength(120)
    email: string;

    // Redes sociales: cada una en su propio campo (usuario o URL completa).
    @IsOptional() @IsString(SOCIAL) @MaxLength(200) instagram?: string;
    @IsOptional() @IsString(SOCIAL) @MaxLength(200) tiktok?: string;
    @IsOptional() @IsString(SOCIAL) @MaxLength(200) facebook?: string;
    @IsOptional() @IsString(SOCIAL) @MaxLength(40) whatsapp?: string;
    @IsOptional() @IsString(SOCIAL) @MaxLength(200) x?: string;
    @IsOptional() @IsString(SOCIAL) @MaxLength(200) youtube?: string;
    @IsOptional() @IsString(SOCIAL) @MaxLength(200) website?: string;

    @IsOptional()
    @ValidateIf((_o, v) => v !== '' && v !== null)
    @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'El color debe tener el formato #RRGGBB' })
    primaryColor?: string;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(0)
    @Max(168)
    cancellationHours?: number;
}
