import { Component, inject, OnInit } from '@angular/core';
import { SharedService } from './shared/services/shared.service';
import { RouterOutlet } from '@angular/router';
import HeaderComponent from './header/header.component';
import { FooterComponent } from './footer/footer.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit {
  private store = inject(SharedService);

  ngOnInit() {
    // Logo, nombre y color de marca del negocio para toda la web.
    this.store.loadBusinessInfo().catch(() => undefined);
  }
}
