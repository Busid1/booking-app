import { Component, inject, OnInit } from '@angular/core';
import { SharedService } from './shared/services/shared.service';
import { RouterOutlet } from '@angular/router';
import HeaderComponent from './header/header.component';
import { FooterComponent } from './footer/footer.component';
import { PwaService } from './shared/services/pwa.service';
import { IosInstallHelpComponent } from './shared/services/ios-install-help.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, IosInstallHelpComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private store = inject(SharedService);
  // Se crea al arrancar para no perder el aviso de instalación del navegador.
  private pwa = inject(PwaService);

  ngOnInit() {
    // Logo, nombre y color de marca del negocio para toda la web.
    this.store.loadBusinessInfo().catch(() => undefined);
    this.store.loadConfig().catch(() => undefined);
  }
}
