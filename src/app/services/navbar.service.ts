import { Injectable } from '@angular/core';
import { Observable ,  Subject ,  BehaviorSubject } from 'rxjs';
import { ElectronService } from 'ngx-electron';
import { HttpClient } from '@angular/common/http';
import * as cheerio from 'cheerio';
import { ResponseContentType } from '@angular/http';

@Injectable()
export class NavbarService {

  private local_path = this._electronService.remote.getGlobal('local_path');
  private fs = this._electronService.remote.getGlobal('fs');
  private zip = this._electronService.remote.getGlobal('zip');
  private path = this._electronService.remote.getGlobal('path');

  // private current_show = new BehaviorSubject({});
  private current_show = new Subject();

  constructor(
    private _electronService: ElectronService,
    private http: HttpClient
  ) {}

  setShow(show: Object) {
    console.log('Calling setShow', show);
    this.current_show.next(show);
  }

  getShow(): Observable<any> {
    console.log('Calling getShow');
    return this.current_show.asObservable();
  }

}
