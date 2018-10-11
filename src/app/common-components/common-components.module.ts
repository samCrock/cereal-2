import {NgModule} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FlexLayoutModule} from '@angular/flex-layout';
import {RouterModule} from '@angular/router';
import {EpisodeComponent, NavbarComponent, ShowPreviewComponent, ExpandedCardComponent, DialogComponent, PageLoaderComponent} from '.';
import {MatDialogModule} from '@angular/material';
// Pipes
import {SortPipe, TrimPipe} from '../pipes';

const COMMON_COMPONENTS = [
  EpisodeComponent,
  NavbarComponent,
  ShowPreviewComponent,
  ExpandedCardComponent,
  DialogComponent,
  PageLoaderComponent
];

@NgModule({
  imports: [
    CommonModule,
    FlexLayoutModule,
    RouterModule,
    MatDialogModule
  ],
  declarations: [
    ...COMMON_COMPONENTS,
    SortPipe,
    TrimPipe
  ],
  exports: [
    ...COMMON_COMPONENTS,
    SortPipe,
    TrimPipe
  ],
  // entryComponents: [DialogComponent]
})
export class CommonComponentsModule {
}
