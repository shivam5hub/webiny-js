import { ErrorResponse, Response, NotFoundResponse } from "@webiny/graphql";
import { SecurityUserManagementPlugin } from "@webiny/api-security-user-management/types";
import { GraphQLFieldResolver } from "@webiny/graphql/types";

export default (userFetcher): GraphQLFieldResolver => async (root, args, context) => {
    const { id } = args;
    const User = userFetcher(context);
    const user = await User.findById(id);

    if (!user) {
        return new NotFoundResponse(id ? `User "${id}" not found!` : "User not found!");
    }

    try {
        await user.delete();
        const authPlugin = context.plugins.byName<SecurityUserManagementPlugin>(
            "security-user-management"
        );

        await authPlugin.deleteUser({ user }, context);

        return new Response(true);
    } catch (e) {
        return new ErrorResponse({
            code: e.code,
            message: e.message,
            data: e.data
        });
    }
};