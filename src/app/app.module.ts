import 'zone.js/dist/zone-mix';
import 'reflect-metadata';
import '../polyfills';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { HttpClientModule, HttpClient } from '@angular/common/http';
import { HttpClientJsonpModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';

// Material
import { MatButtonModule, MatCheckboxModule, MatIconModule, MatDialogModule } from '@angular/material';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

// import 'materialize-css';
// import { MaterializeModule } from 'angular2-materialize';

import { NgxElectronModule } from 'ngx-electron';

// NG Translate
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { FlexLayoutModule } from '@angular/flex-layout';

import { ElectronService } from './providers/electron.service';
import { WebviewDirective } from './directives/webview.directive';

import { AppComponent } from './app.component';
import {HomeComponent, ShowComponent, PlayerComponent, SearchComponent, LibraryComponent, TrendingComponent} from './components/index';
import { DialogComponent } from './common-components/index';

// Services
import { ScrapingService, TorrentService, DbService, SubsService, NavbarService } from './services/index';

import { TorrentsComponent } from './components/torrents/torrents.component';

import { CommonComponentsModule } from './common-components/common-components.module';


const materialDependencies = [
  MatButtonModule,
  MatCheckboxModule,
  MatIconModule,
  MatDialogModule
];

// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    ShowComponent,
    PlayerComponent,
    SearchComponent,
    WebviewDirective,
    TorrentsComponent,
    SearchComponent,
    LibraryComponent,
    TrendingComponent
  ],
  imports: [
    BrowserModule,
    NgxElectronModule,
    materialDependencies,
    // MaterializeModule,
    FlexLayoutModule,
    HttpClientJsonpModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    AppRoutingModule,
    BrowserAnimationsModule,
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
    SubsService,
    NavbarService
  ],
  entryComponents: [DialogComponent],
  bootstrap: [AppComponent]
})
export class AppModule { }
