import { Component, inject } from '@angular/core';
import { ModalComponent } from './modal.component';
import { PwaService } from './pwa.service';

/** Instrucciones para instalar la web en iPhone/iPad (Safari no tiene botón de instalar). */
@Component({
  selector: 'app-ios-install-help',
  standalone: true,
  imports: [ModalComponent],
  template: `
  <app-modal [open]="pwa.iosHelp()" (closed)="pwa.iosHelp.set(false)" size="sm" title="Instalar en iPhone o iPad"
    subtitle="Solo se puede desde Safari.">
    <ol class="space-y-4 text-sm text-slate-600">
      <li class="flex gap-3">
        <span class="grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">1</span>
        <span>Pulsa el botón <strong class="text-slate-900">Compartir</strong>
          <i class="fas fa-arrow-up-from-bracket mx-1 text-brand-600"></i> en la barra de Safari.</span>
      </li>
      <li class="flex gap-3">
        <span class="grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">2</span>
        <span>Elige <strong class="text-slate-900">«Añadir a pantalla de inicio»</strong>
          <i class="far fa-square-plus mx-1 text-brand-600"></i>.</span>
      </li>
      <li class="flex gap-3">
        <span class="grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 font-bold text-brand-700">3</span>
        <span>Abre la app desde el nuevo icono y pulsa <strong class="text-slate-900">«Activar avisos»</strong>.</span>
      </li>
    </ol>
    <div modal-footer class="border-t border-slate-100 px-5 py-4 sm:px-6">
      <button type="button" class="btn btn-primary w-full" (click)="pwa.iosHelp.set(false)">Entendido</button>
    </div>
  </app-modal>
  `,
})
export class IosInstallHelpComponent {
  readonly pwa = inject(PwaService);
}
