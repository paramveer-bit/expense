import mongoose from "mongoose";

type ConnectionObject = {
    isConnected?: number
}

const connection: ConnectionObject = {}

export default async function dbConnect(): Promise<void> {
    try {

        if (connection.isConnected) {
            console.log("Connection already exists")
            return
        }

        const db = await mongoose.connect(process.env.MONGOOSE_URI || '', {})

        connection.isConnected = db.connections[0].readyState

        console.log("Connection created")

    } catch (error) {
        console.log("Error in connecting to database" + error)
        process.exit(1)
    }

}

