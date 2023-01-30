import { FastifyPluginAsyncJsonSchemaToTs } from '@fastify/type-provider-json-schema-to-ts';
import { idParamSchema } from '../../utils/reusedSchemas';
import { createProfileBodySchema, changeProfileBodySchema } from './schema';
import type { ProfileEntity } from '../../utils/DB/entities/DBProfiles';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
  fastify
): Promise<void> => {
  fastify.get('/', async function (request, reply): Promise<ProfileEntity[]> {
    const profiles = await fastify.db.profiles.findMany();
    return reply.send(profiles);
  });

  fastify.get(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const { id } = request.params;

      const profile = await fastify.db.profiles.findOne({ key: 'id', equals: id });
      if (!profile) throw fastify.httpErrors.notFound();
      return reply.send(profile);
    }
  );

  fastify.post(
    '/',
    {
      schema: {
        body: createProfileBodySchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const { body } = request;
      const userId = body.userId;
      const profile = await fastify.db.profiles.findOne({ key: 'userId', equals: userId });
      const newProfile = await fastify.db.profiles.create(body);
      const types = ['business', 'basic'];

      if (profile || !newProfile.id || !types.includes(newProfile.memberTypeId)) throw fastify.httpErrors.badRequest();
      return reply.send(newProfile);
    }
  );

  fastify.delete(
    '/:id',
    {
      schema: {
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const { id } = request.params;

      try {
        const deletedProfile = await fastify.db.profiles.delete(id);
        return reply.send(deletedProfile);
      } catch (error) {
        throw fastify.httpErrors.badRequest();
      }
    }
  );

  fastify.patch(
    '/:id',
    {
      schema: {
        body: changeProfileBodySchema,
        params: idParamSchema,
      },
    },
    async function (request, reply): Promise<ProfileEntity> {
      const { id } = request.params;
      const { body } = request;

      try {
        const updatedProfile = await fastify.db.profiles.change(id, body);
        return reply.send(updatedProfile);
      } catch (error) {
        throw fastify.httpErrors.badRequest();
      }
    }
  );
};

export default plugin;