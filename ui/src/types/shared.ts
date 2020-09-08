export abstract class ServerSocketEvent {
    type: string

    protected constructor(type: string) {
        this.type = type
    }
}

export class JoinedSessionSuccessfully extends ServerSocketEvent {
    constructor() {
        super("JOINED_SESSION_SUCCESSFULLY")
    }
}

export class CreatedSessionSuccessfully extends ServerSocketEvent {
    constructor() {
        super("CREATED_SESSION_SUCCESSFULLY")
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
