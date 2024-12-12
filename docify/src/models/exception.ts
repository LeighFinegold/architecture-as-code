export class CalmException extends Error {
    constructor(public message: string, public code?: string) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, CalmException.prototype);
    }
}

export class FileNotFoundException extends CalmException {
    constructor(path: string) {
        super(`File not found: ${path}`, 'FILE_NOT_FOUND');
    }
}

export class NotImplementedException extends CalmException {
    constructor(path: string) {
        super(`Feature Not Implemented Yet`, 'NOT_IMPLEMENTED');
    }
}