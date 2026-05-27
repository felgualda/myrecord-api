import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface OptionalAuthRequest extends Request {
    userId?: string;
}

export function optionalAuth(req: OptionalAuthRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return next();
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as unknown as { id: string };
        req.userId = decoded.id;
    } catch (error) {
        console.error(error);
    }

    next();
}