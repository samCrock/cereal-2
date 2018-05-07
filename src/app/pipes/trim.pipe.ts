import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
	name: 'trim'
})
export class TrimPipe implements PipeTransform {
	transform(_string: string): string {
		let result = _string;
		let wxl = window.matchMedia('(min-width: 1200px)');
		let wl = window.matchMedia('(min-width: 993px)');
		let wm = window.matchMedia('(min-width: 601px)');
		if (_string.length > 80 && !wxl.matches) { 
			result = _string.substring(0, 80) + '...' 
			if (!wl.matches) {
				result = _string.substring(0, 70) + '...' 
			}
			if (!wm.matches) {
				result = _string.substring(0, 60) + '...' 
			}
		}
		return result;
	}
}