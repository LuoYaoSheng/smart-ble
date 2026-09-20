export namespace main {
	
	export class ScanHit {
	    address: string;
	    name: string;
	    rssi: number;
	
	    static createFrom(source: any = {}) {
	        return new ScanHit(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.address = source["address"];
	        this.name = source["name"];
	        this.rssi = source["rssi"];
	    }
	}

}

