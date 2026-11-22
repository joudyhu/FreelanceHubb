export const ROLES_KEY = 'roles';

const SetMetadata = (key: string, value: unknown): MethodDecorator & ClassDecorator =>
	(target, propertyKey, descriptor) => {
		const reflect = Reflect as typeof Reflect & {
			defineMetadata?: (metadataKey: string, metadataValue: unknown, target: object) => void;
		};

		if (!reflect.defineMetadata) {
			throw new Error('Reflect metadata support is required to use Roles.');
		}

		reflect.defineMetadata(key, value, descriptor?.value ?? target);
	};

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
