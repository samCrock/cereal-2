import { Component, OnInit } from '@angular/core';
import { DbService } from '../../services/index';
import {fade} from '../../animations/fade';

@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss'],
  animations: [ fade ]
})
export class LibraryComponent implements OnInit {

  public library;
  public loading: boolean;

  constructor(public dbService: DbService) {}

  ngOnInit() {
    this.loading = true;
    this.dbService.getLibrary()
      .subscribe(library => {
        this.library = library.filter(show => show['watching_season']);
        console.log('Library:', this.library);
        this.loading = false;
      });
  }

}
