import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlexLayoutModule } from '@angular/flex-layout';
import { RouterModule } from '@angular/router';
import {
  EpisodeComponent,
  NavbarComponent,
  ShowPreviewComponent,
  ExpandedCardComponent,
  DialogComponent,
  PageLoaderComponent,
  DateWidgetComponent,
  ProgressWidgetComponent
} from '.';
// Pipes
import { SortPipe, TrimPipe } from '../pipes';
import { IconComponent } from './icon/icon.component';
import {MatDialogModule} from '@angular/material/dialog';

const COMMON_COMPONENTS = [
  EpisodeComponent,
  NavbarComponent,
  ShowPreviewComponent,
  ExpandedCardComponent,
  DialogComponent,
  PageLoaderComponent,
  IconComponent,
  DateWidgetComponent,
  ProgressWidgetComponent
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
