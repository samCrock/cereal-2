import { Component, Input, OnChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { DbService, SubsService, ScrapingService, TorrentService } from '../../services';
import { ElectronService } from 'ngx-electron';
import { Router } from '@angular/router';

@Component({
  selector: 'app-expanded-card',
  templateUrl: './expanded-card.component.html',
  styleUrls: ['./expanded-card.component.scss'],
  providers: [DbService, ScrapingService, SubsService, TorrentService]
})
export class ExpandedCardComponent implements OnChanges {

  @Input() show: Object;

  public path = this.electronService.remote.getGlobal('path');
  public shell = this.electronService.remote.getGlobal('shell');
  public expanded = false;
  public hoveringEpisode = {};
  public isPosterAsync = false;

  constructor(
    public dbService: DbService,
    public scrapingService: ScrapingService,
    public subsService: SubsService,
    public torrentService: TorrentService,
    public electronService: ElectronService,
    public router: Router
  ) { }

  ngOnChanges() {
    if (this.show['poster'] instanceof Observable) {
      this.isPosterAsync = true;
    }
  }

  enterCard(event, show) {
    const card = event.srcElement;
    this.hoveringEpisode = show;
    if (this.hoveringEpisode['episode'].indexOf('Special') > -1) {
      this.hoveringEpisode['episode'] = '- Special Episode -';
    }

    document.querySelectorAll('[id=expanded_card]')['forEach']((element: HTMLElement) => {
      element.style.display = 'none';
    });
    const expCard = event.srcElement.nextElementSibling;
    const targetCoordinates = event.target.getBoundingClientRect();
    const target = event.target;
    const beforeTransitions = `
    background-image 0s,
    box-shadow 0s,
    height 0s,
    width 0s,
    left 0s,
    top 0s,
    font-size 0s,
    background-size 0s,
    ease-in-out`;
    const afterTransitions = `
    background-image 0s,
    box-shadow .6s,
    height .6s,
    width .6s,
    left .6s,
    top .6s,
    font-size .6s,
    background-size 0s ease-in-out`;

    expCard.style.transition = beforeTransitions;
    expCard.style.display = 'block';

    // START
    const cardStyle = window.getComputedStyle(card);
    const computedCardH = cardStyle.height.split('px')[0];
    const computedCardW = cardStyle.width.split('px')[0];

    expCard.style.top = 'calc(' + target.offsetTop + 'px - 2px)';
    expCard.style.left = 'calc(' + targetCoordinates.left + 'px - 2px)';

    expCard.style.width = 'calc(' + computedCardW + 'px + 2px)';
    expCard.style.height = 'calc(' + computedCardH + 'px + 2px)';

    expCard.style.backgroundImage = target.style.backgroundImage;
    // expCard.getElementsByClassName('card-title')[0]['style']['transition'] = beforeTransitions;
    // expCard.getElementsByClassName('card-title')[0]['style']['font-size'] = 'calc(1rem + 1vw)';

    // TRANSITION
    setTimeout(()  => {
      expCard.style.transition = afterTransitions;
      expCard.style.top = 'calc(' + target.offsetTop + 'px - ' + Math.floor(+computedCardH / 10) + 'px)';
      expCard.style.left = 'calc(' + targetCoordinates.left + 'px - ' + Math.floor(+computedCardW / 10) + 'px)';

      expCard.style.width = 'calc(' + computedCardW + 'px + ' + Math.floor(+computedCardW / 5) + 'px)';
      expCard.style.height = 'calc(' + computedCardH + 'px + ' + Math.floor(+computedCardH / 5) + 'px)';

      // expCard.getElementsByClassName('card-title')[0]['style']['transition'] = afterTransitions;
      // expCard.getElementsByClassName('card-title')[0]['style']['font-size'] = 'calc(1.2rem + 1vw)';
      // expCard.getElementsByClassName('card-title')[0]['style']['line-height'] = 'calc(1.2rem + 1vw)';
    }, 10);

    document.onmousemove = handleMouseMove;

    function handleMouseMove(_event) {
      const expCardCoordinates = expCard.getBoundingClientRect();
      if (
        (_event.clientX < targetCoordinates.left) && (_event.clientX < expCardCoordinates.left) ||
        (_event.clientX > targetCoordinates.left + targetCoordinates.width) &&
        (_event.clientX > expCardCoordinates.left + expCardCoordinates.width) ||
        (_event.clientY < targetCoordinates.top && (_event.clientY < expCardCoordinates.top) ||
          (_event.clientY > targetCoordinates.top + targetCoordinates.height) &&
          (_event.clientY > expCardCoordinates.top + expCardCoordinates.height))
      ) {
        // console.log('leave >>');
        expCard.style.display = 'none';
        document.onmousemove = null;
        this.hoveringEpisode = {};
      }
    }
  }

  openShow() {
    this.router.navigate(['/show', this.hoveringEpisode['dashed_title']]);
  }


}
