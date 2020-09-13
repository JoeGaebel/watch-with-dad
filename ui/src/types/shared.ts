export abstract class ServerSocketEvent {
    type: string

    protected constructor(type: string) {
        this.type = type
    }
}

export class ConnectedToServerSuccessfully extends ServerSocketEvent {
    constructor() {
        super("CONNECTED_TO_SERVER_SUCCESSFULLY");
    }
}

export class JoinedSessionSuccessfully extends ServerSocketEvent {
    sessionId: string
    constructor(sessionId: string) {
        super("JOINED_SESSION_SUCCESSFULLY")
        this.sessionId = sessionId
    }
}

export class CreatedSessionSuccessfully extends ServerSocketEvent {
    sessionId: string
    constructor(sessionId: string) {
        super("CREATED_SESSION_SUCCESSFULLY")
        this.sessionId = sessionId
    }
}

export class CreatedSessionFailure extends ServerSocketEvent {
    constructor() {
        super("CREATE_SESSION_FAILURE")
    }
}

export class JoinedSessionFailure extends ServerSocketEvent {
    constructor() {
        super("JOIN_SESSION_FAILURE")
    }
}

export class ServerMessage extends ServerSocketEvent {
    message: string

    constructor(message: string) {
        super("SERVER_MESSAGE")
        this.message = message
    }
}

export abstract class ClientSocketEvent {
    type: string
    sessionId: string
    userId: string

    protected constructor(type: string, sessionId: string, userId: string) {
        this.type = type
        this.sessionId = sessionId
        this.userId = userId
    }
}

export class CreateSessionEvent extends ClientSocketEvent {
    constructor(sessionId: string, userId: string) {
        super("CREATE_SESSION", sessionId, userId)
    }
}

export class JoinSessionEvent extends ClientSocketEvent {
    constructor(sessionId: string, userId: string) {
        super("JOIN_SESSION", sessionId, userId)
    }
}

export class SendMessageEvent extends ClientSocketEvent {
    message: string

    constructor(message: string, sessionId: string, userId: string) {
        super("SEND_MESSAGE", sessionId, userId)
        this.message = message
    }
}

export interface AppState {
    connectedToServer: boolean,
    connectedToSession: boolean,
    joinSessionFailure: boolean,
    createSessionFailure: boolean,
    sessionId: string,
    userId: string
}