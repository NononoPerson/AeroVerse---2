export class UpdateManager {

    constructor() {

        this.systems = [];

    }

    register(name, callback) {

        this.systems.push({
            name,
            callback
        });

    }

    unregister(name) {

        this.systems = this.systems.filter(
            system => system.name !== name
        );

    }

    update(delta) {

        for (const system of this.systems) {

            system.callback(delta);

        }

    }

}