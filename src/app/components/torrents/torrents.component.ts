import { Component, OnInit } from '@angular/core';
import { TorrentService, DbService } from '../../services';
import { Observable } from 'rxjs/Observable';
import * as moment from 'moment';

@Component({
  selector: 'app-torrents',
  templateUrl: './torrents.component.html',
  styleUrls: ['./torrents.component.scss']
})
export class TorrentsComponent implements OnInit {

  public torrents;

  constructor(
    public torrentService: TorrentService,
    public dbService: DbService
  ) {}

  ngOnInit() {
    this.setup();
  }

  setup() {
    this.dbService.getPendingTorrents()
      .subscribe(torrents => {
        console.log(torrents);
        this.torrents = torrents;
      });
  }

  episodeDeleted() {
    this.setup();
  }

}

