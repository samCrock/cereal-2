import { Component, OnInit } from '@angular/core';
import { DbService } from '../../services/index';
import { isDefined } from '@angular/compiler/src/util';

@Component({
  selector: 'app-library',
  templateUrl: './library.component.html',
  styleUrls: ['./library.component.scss']
})
export class LibraryComponent implements OnInit {

  private library;
  constructor(private dbService: DbService) {}

  ngOnInit() {
    this.dbService.getLibrary()
      .subscribe(library => {
        this.library = library.filter(show => show['watching_season']);
        console.log('Library:', library);
      });
  }

}
