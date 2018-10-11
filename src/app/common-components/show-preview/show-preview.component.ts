import { Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ScrapingService, DbService } from '../../services/index';
import { Router } from '@angular/router';
import { MatDialog, MatDialogRef } from '@angular/material';
import { DialogComponent } from '../dialog/dialog.component';
import * as Materialize from 'materialize-css';
import {fade} from '../../animations/fade';

@Component({
  selector: 'app-show-preview',
  templateUrl: './show-preview.component.html',
  styleUrls: ['./show-preview.component.scss'],
  animations: [fade]
})
export class ShowPreviewComponent implements OnChanges {


  @Input() show: Object;
  confirmDialogRef: MatDialogRef<DialogComponent>;

  public openedTrailer = false;
  public sanitizedTrailer;
  public wallpaper;
  public showDelete;
  constructor(
    public sanitizer: DomSanitizer,
    public scrapingService: ScrapingService,
    public dbService: DbService,
    public router: Router,
    public dialog: MatDialog
  ) {}

  ngOnChanges() {
    this.showDelete = false;
    if (this.show && this.router.url !== '/search') {
      this.showDelete = true;
      this.scrapingService.retrieveRemoteWallpaper(this.show['dashed_title'])
      .subscribe(path => {
        this.wallpaper = path;
        const bgContainer = document.getElementsByClassName('bg-container')[0];
        document.documentElement['style'].background = 'linear-gradient(to bottom, rgba(58, 70, 76, .8), rgba(58, 70, 76, .8)),' +
        'url(' + path + ') no-repeat center fixed ';
      });
    }
  }

  play_trailer() {
    this.openedTrailer = true;
  }

  delete_show() {
    this.confirmDialogRef = this.dialog.open(DialogComponent);
    this.confirmDialogRef.afterClosed()
    .subscribe(confirmed => {
      if (confirmed) {
        this.dbService.deleteShow(this.show['dashed_title'])
        .subscribe(result => {
          console.log('deleteShow', result);
          this.router.navigate(['']);
          Materialize.toast({
            html: this.show['title'] + ' has been deleted',
            displayLength: 2000,
            inDuration: 600,
            outDuration: 400,
            classes: ''
          });
        });
      }
    });
  }

  getTrailer() {
    if (!this.sanitizedTrailer) {
      this.sanitizedTrailer = this.sanitizer.bypassSecurityTrustResourceUrl(this.show['trailer'].replace('watch?v=', 'embed/'));
    }
    return this.sanitizedTrailer;
  }

  closeTrailer() {
    this.openedTrailer = false;
  }

}
