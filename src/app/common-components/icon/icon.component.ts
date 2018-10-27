import {Component, Input, OnChanges} from '@angular/core';

@Component({
  selector: 'app-icon',
  templateUrl: './icon.component.html',
  styleUrls: ['./icon.component.scss']
})
export class IconComponent implements OnChanges {

  @Input() name: string;
  @Input() isActive: boolean;

  constructor() { }

  ngOnChanges() {}

}
