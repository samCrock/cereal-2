import { Injectable } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { BehaviorSubject } from 'rxjs';

@Injectable()
export class WtService {

  private wt;
  private clientSubject: BehaviorSubject<any>;

  constructor(private electronService: ElectronService) {
    console.log(this.electronService);
    this.wt = this.electronService.remote.getGlobal('wt');
    this.clientSubject = new BehaviorSubject<any>(this.wt);
  }

  getClient(): BehaviorSubject<any> {
    return this.clientSubject;
  }

}
