import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SharedService } from '../../../shared/services/shared.service';
declare const google: any;

@Component({
    selector: 'app-google-calendar',
    template: `    
  <button type="button" (click)="connect()"
        class="text-white bg-[#4285F4] hover:bg-[#4285F4]/90 focus:ring-4 focus:outline-none focus:ring-[#4285F4]/50 font-medium rounded-lg text-sm px-5 py-2.5 text-center inline-flex items-center dark:focus:ring-[#4285F4]/55 me-2 mb-2">
        <svg class="w-4 h-4 me-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor"
            viewBox="0 0 18 19">
            <path fill-rule="evenodd"
                d="M8.842 18.083a8.8 8.8 0 0 1-8.65-8.948 8.841 8.841 0 0 1 8.8-8.652h.153a8.464 8.464 0 0 1 5.7 2.257l-2.193 2.038A5.27 5.27 0 0 0 9.09 3.4a5.882 5.882 0 0 0-.2 11.76h.124a5.091 5.091 0 0 0 5.248-4.057L14.3 11H9V8h8.34c.066.543.095 1.09.088 1.636-.086 5.053-3.463 8.449-8.4 8.449l-.186-.002Z"
                clip-rule="evenodd" />
        </svg>
        Sincronizar calendario con Google Calendar
    </button> 
    `,
    standalone: true,
})

export class GoogleCalendarComponent implements OnInit {

    CLIENT_ID = '1072538243578-3ikvcs383jhrmjpko8ka7o0ak1u7v4ju.apps.googleusercontent.com';
    SCOPES = 'https://www.googleapis.com/auth/calendar';
    tokenClient: any;

    ngOnInit() {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES,
            callback: (response: any) => {
                if (response.error) {
                    console.error(response);
                    return;
                }
                console.log('✅ Access Token:', response.access_token);
            }
        });
    }

    @Output() tokenGenerated = new EventEmitter<string>();

    connect() {
        const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: this.CLIENT_ID,
            scope: this.SCOPES,
            callback: (response: any) => {
                this.tokenGenerated.emit(response.access_token);
            },
        });

        tokenClient.requestAccessToken();
    }
}
