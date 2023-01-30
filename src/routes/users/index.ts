import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import {
  createUserBodySchema,
  changeUserBodySchema,
  subscribeBodySchema,
} from './schemas';
import type { UserEntity } from '../../utils/DB/entities/DBUsers';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<UserEntity[]> {
    const allUsers = await fastify.db.users.findMany();
    return reply.send(allUsers);
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;
      const user = await fastify.db.users.findOne({ key: 'id', equals: id });

      if (!user) throw fastify.httpErrors.notFound();
      return reply.send(user);
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createUserBodySchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      try {
        const newUser = await fastify.db.users.create(request.body);
        return reply.send(newUser);
      } catch (error) {
        throw fastify.httpErrors.badRequest();
      }
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;
      try {
        const deletedUser = await fastify.db.users.delete(id);
        const children = await fastify.db.users.findMany({ key: 'subscribedToUserIds', equals: [deletedUser.id]});
        const posts = await fastify.db.posts.findMany({ key: 'userId', equals: deletedUser.id });
        const profile = await fastify.db.profiles.findOne({ key: "userId", equals: deletedUser.id });

        children.map(async child => await fastify.db.users.change(child.id, { 
          subscribedToUserIds: child.subscribedToUserIds.filter(id => id !== deletedUser.id) 
        }));
        posts.map(async post => await fastify.db.posts.delete(post.id));
        profile ? await fastify.db.profiles.delete(profile.id) : null;
        return reply.send(deletedUser);
      } catch (error) {
        throw fastify.httpErrors.badRequest();
      }
    }
  );

  fastify.post(
    '/:id/subscribeTo',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const parentId = request.params.id;
      const childId = request.body.userId;
      try {
        const parentUser = await fastify.db.users.findOne({ key: 'id', equals: parentId });
        const childUser = await fastify.db.users.findOne({ key: 'id', equals: childId });

        if (!parentUser || !childUser) throw fastify.httpErrors.notFound();

        const parentIds = [...parentUser.subscribedToUserIds, childId];
        const childIds = [...childUser.subscribedToUserIds, parentId];

        const updatedParent = await fastify.db.users.change(parentId, { subscribedToUserIds: parentIds });
        await fastify.db.users.change(childId, { subscribedToUserIds: childIds });
        return reply.status(200).send(updatedParent);
      } catch (error) {
        throw fastify.httpErrors.badRequest();
      }
    }
  );

  fastify.post(
    '/:id/unsubscribeFrom',
    {
      schema: {
        body: subscribeBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const parentId = request.params.id;
      const childId = request.body.userId;
      try {
        const parentUser = await fastify.db.users.findOne({ key: 'id', equals: parentId });
        const childUser = await fastify.db.users.findOne({ key: 'id', equals: childId });
        const isFollower = parentUser?.subscribedToUserIds.includes(childId);

        if (!isFollower) throw fastify.httpErrors.badRequest();
        if (!parentUser || !childUser) throw fastify.httpErrors.notFound();

        const childIds = [...childUser.subscribedToUserIds.filter(id => id !== parentId)];
        const updatedChild = await fastify.db.users.change(childId, { subscribedToUserIds: childIds });

        return reply.status(200).send(updatedChild);   
      } catch (error) {
        throw fastify.httpErrors.badRequest();
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeUserBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<UserEntity> {
      const { id } = request.params;
      const { body } = request; 
      try {
        const updatedUser = await fastify.db.users.change(id, body);
        return reply.send(updatedUser);
      } catch (error) {
        throw fastify.httpErrors.badRequest();
      }
    }
  );
};

export default plugin;
