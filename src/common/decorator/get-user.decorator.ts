import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { User } from "@prisma/client";

const getCurrentUserByContext = (context: ExecutionContext): User => {
    const { user } = context
        .switchToHttp()
        .getRequest();

    return user;
}

export const GetUser = createParamDecorator(
    (_data: unknown, context: ExecutionContext) => getCurrentUserByContext(context)
);
