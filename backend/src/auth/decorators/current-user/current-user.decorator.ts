import { createParamDecorator, ExecutionContext } from '@nestjs/common';

type JwtUserPayload = {
    sub: string;
    role: string;
    sid: string;
    type: 'access' | 'refresh';
};

export const CurrentUser = createParamDecorator(
    (data: keyof JwtUserPayload | undefined, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        const user = request.user as JwtUserPayload | undefined;

        if (!user) {
            return undefined;
        }

        return data ? user[data] : user;
    },
);
