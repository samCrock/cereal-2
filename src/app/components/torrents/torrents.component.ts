import { Component, OnInit } from '@angular/core';
import { TorrentService, DbService } from '../../services';
import { Observable } from 'rxjs';
import * as moment from 'moment';

@Component({
  selector: 'app-torrents',
  templateUrl: './torrents.component.html',
  styleUrls: ['./torrents.component.scss']
})
export class TorrentsComponent implements OnInit {

  public torrents;
  public loading: boolean;

  constructor(
    public torrentService: TorrentService,
    public dbService: DbService
  ) {}

  ngOnInit() {
    this.setup();
  }

  setup() {
    this.loading = true;
    this.dbService.getPendingTorrents()
      .subscribe(torrents => {
        console.log(torrents);
        this.torrents = torrents;
        this.loading = false;
      });
  }

  episodeDeleted() {
    this.setup();
  }

}

