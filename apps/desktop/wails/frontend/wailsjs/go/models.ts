export namespace main {
	
	export class charData {
	    uuid: string;
	    name: string;
	    properties: string[];
	
	    static createFrom(source: any = {}) {
	        return new charData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.uuid = source["uuid"];
	        this.name = source["name"];
	        this.properties = source["properties"];
	    }
	}
	export class hostInfo {
	    platform: string;
	    arch: string;
	
	    static createFrom(source: any = {}) {
	        return new hostInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.platform = source["platform"];
	        this.arch = source["arch"];
	    }
	}
	export class initResult {
	    success: boolean;
	    platform: string;
	
	    static createFrom(source: any = {}) {
	        return new initResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.platform = source["platform"];
	    }
	}
	export class plainResult {
	    success: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new plainResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.error = source["error"];
	    }
	}
	export class serviceData {
	    uuid: string;
	    name: string;
	    characteristics: charData[];
	
	    static createFrom(source: any = {}) {
	        return new serviceData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.uuid = source["uuid"];
	        this.name = source["name"];
	        this.characteristics = this.convertValues(source["characteristics"], charData);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class servicesResult {
	    success: boolean;
	    error?: string;
	    services: serviceData[];
	
	    static createFrom(source: any = {}) {
	        return new servicesResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.error = source["error"];
	        this.services = this.convertValues(source["services"], serviceData);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class valueResult {
	    success: boolean;
	    error?: string;
	    value?: string;
	
	    static createFrom(source: any = {}) {
	        return new valueResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.success = source["success"];
	        this.error = source["error"];
	        this.value = source["value"];
	    }
	}

}

