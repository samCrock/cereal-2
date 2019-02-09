import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable()
export class NavbarService {

  private currentShow = new Subject();

  constructor() {}

  setShow(show) {
    console.log('Calling setShow', show);
    this.currentShow.next(show);
  }

  getShow(): Observable<any> {
    console.log('Calling getShow');
    return this.currentShow.asObservable();
  }

}
