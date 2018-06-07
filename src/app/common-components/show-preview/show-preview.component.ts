import { Component, OnInit, Input, OnChanges } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ScrapingService } from '../../services/scraping.service';
import { style } from '@angular/animations';
import { Router } from '@angular/router';

@Component({
  selector: 'app-show-preview',
  templateUrl: './show-preview.component.html',
  styleUrls: ['./show-preview.component.scss']
})
export class ShowPreviewComponent implements OnChanges {


  @Input() show: Object;

  public openedTrailer = false;
  public sanitizedTrailer;
  public wallpaper;
  constructor(
    public sanitizer: DomSanitizer,
    public scrapingService: ScrapingService,
    public router: Router
  ) {}

  ngOnChanges() {
    if (this.show && this.router.url !== '/search') {
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
