import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Esto lo hace disponible en toda la app sin tener que importar
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
