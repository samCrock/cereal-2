import 'zone.js/dist/zone-mix';
import 'reflect-metadata';
import '../polyfills';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { HttpClientModule, HttpClient } from '@angular/common/http';
import { HttpClientJsonpModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';

// Material
import { MatButtonModule, MatCheckboxModule, MatIconModule } from '@angular/material';

import { NgxElectronModule } from 'ngx-electron';

// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { FlexLayoutModule } from '@angular/flex-layout';

import { ElectronService } from './providers/electron.service';
import { WebviewDirective } from './directives/webview.directive';

import { AppComponent } from './app.component';
import { HomeComponent } from './components/home/home.component';
import { ShowComponent } from './components/show/show.component';

// Services
import { ScrapingService } from './services/scraping.service';
import { TorrentService } from './services/torrent.service';
import { DbService } from './services/db.service';
import { SubsService } from './services/subs.service';

import { TorrentsComponent } from './components/torrents/torrents.component';

import { CommonComponentsModule } from './common-components/common-components.module';


const materialDependencies = [
MatButtonModule,
MatCheckboxModule,
MatIconModule
]

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
  AppComponent,
  HomeComponent,
  ShowComponent,
  WebviewDirective,
  TorrentsComponent
  ],
  imports: [
  BrowserModule,
  NgxElectronModule,
  materialDependencies,
  FlexLayoutModule,
  HttpClientJsonpModule, 
  FormsModule,
  HttpClientModule,
  AppRoutingModule,
  TranslateModule.forRoot({
    loader: {
      provide: TranslateLoader,
      useFactory: (HttpLoaderFactory),
      deps: [HttpClient]
    }
  }),
  CommonComponentsModule
  ],
  exports: [materialDependencies],
  providers: [
  ElectronService,
  ScrapingService,
  TorrentService,
  DbService,
  SubsService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
