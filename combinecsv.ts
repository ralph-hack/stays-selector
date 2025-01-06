import * as fs from "fs";
import { parse } from "csv-parse";

// Define the CSV file path
var filePaths = ["ibaguecustom1.csv","ibaguecustom2.csv","ibaguecustom3.csv","ibaguecustom4.csv","ibaguecustom5.csv","ibaguecustom6.csv"];
for (const filePath of filePaths) {
    const readableStream = fs.createReadStream(filePath, "utf-8");
    const parser = parse({ from_line: 2, delimiter: "," });

    let records: { [key: string]: string }[] = [];

    readableStream.pipe(parser);

    parser.on("data", (row) => {
    records.push(row);
    });

    parser.on("end", () => {
    console.log(records);
    // Process the parsed data (array of objects)
    // ========================================================
    // 1. Rank the flights by Rating (@column 1)
    // ========================================================
    let colStart = 0;
    const ID_COLUMN = colStart++;
    const RATING_COLUMN = colStart++;
    const maxRating = 5;
    type Rank = {
        id: string;
        value: any;
        rank: number;
    };
    const ratingRanks: Rank[] = [];

    type FlightRank = {
        id: string;
        rankRating: number;
        rankDayLeave: number;
        rankDayReturn: number;
        rankPrice: number;
        rankDurationLeave: number;
    };
    const flightRanks: FlightRank[] = [];

    // ========================================================
    // 2. Rank the flights by Day_Leave (@column 2)
    // ========================================================
    const DAY_LEAVE_COLUMN = colStart++;
    const dayLeaveRanks: Rank[] = [];
    enum WeekDayRank {
        FRI = 2,
        SAT = 1,
        SUN = 1,
        MON = 5,
        TUES = 4,
        WED = 5,
        THURS = 3,
    }

    // ========================================================
    // 3. Rank the flights by Day_Return (@column 3)
    // ========================================================
    const DAY_RETURN_COLUMN = colStart++;
    const dayReturnRanks: Rank[] = [];

    // ========================================================
    // 4. Rank the flights by Price (@column 4)
    // ========================================================
    const PRICE_COLUMN = colStart++;
    const NO_PRICE = -99;
    const priceRanks: Rank[] = [];
    const allPrices: Rank[] = [];

    // ========================================================
    // 5. Rank the flights by Duration_Leave (@column 5)
    // ========================================================
    const DURATION_LEAVE_COLUMN = colStart++;
    const durationLeaveRanks: Rank[] = [];
    const allDurationLeaves: Rank[] = [];
    console.log("Processing records");
    for (const record of records) {
        const price = parseFloat(record[PRICE_COLUMN]);
        allPrices.push({ id: record[ID_COLUMN], value: price, rank: 0 });
        const durationLeave = record[DURATION_LEAVE_COLUMN];
        const durationLeaveObject = parseDurationDayJs(durationLeave);
        allDurationLeaves.push({
        id: record[ID_COLUMN],
        value: durationLeaveObject,
        rank: 0,
        });
        setRatingRank(record);
        setWeekDayRank(record, DAY_LEAVE_COLUMN, dayLeaveRanks);
        setWeekDayRank(record, DAY_RETURN_COLUMN, dayReturnRanks);
    }
    // SORTING
    console.log("Sorting and ranking");
    sortAndRankPrices();
    sortAndRankDurationLeaves();

    // SETTING ADDITIONAL RANKS
    console.log("Setting additional ranks");
    for (const record of records) {
        setPriceRank(record);
        setDurationLeaveRank(record);
    }
    // const sortedRatingRanks = ratingRanks.sort((a, b) => a.rank - b.rank);
    console.log("ranking for rating: ", ratingRanks);
    // console.log("sorted ranking for rating: ", sortedRatingRanks);

    // const sortedDayLeaveRanks = dayLeaveRanks.sort((a, b) => a.rank - b.rank);
    console.log("ranking for day_leave: ", dayLeaveRanks);
    // console.log("sorted ranking for day_leave: ", sortedDayLeaveRanks);

    console.log("ranking for day_return: ", dayReturnRanks);
    console.log("ranking for price: ", priceRanks);
    console.log("ranking for duration_leaves: ", durationLeaveRanks);
    console.log("flight ranks: ", flightRanks);
    console.log("done");

    function createDuration(): dayjs.Dayjs {
        let duration = dayjs();
        // Loop through year, month, day, hour, minute, second, and millisecond
        for (const unit of [
        "year",
        "month",
        "day",
        "hour",
        "minute",
        "second",
        "millisecond",
        ]) {
        duration = duration.set(unit as UnitType, 0);
        }
        return duration;
    }

    function sortAndRankPrices() {
        allPrices.sort((a, b) => a.value - b.value);
        let currentPriceRank = 1;
        let prevPrice = NO_PRICE;
        for (const [index, priceObj] of allPrices.entries()) {
        const hasPrevPrice = prevPrice !== NO_PRICE;
        if (hasPrevPrice) {
            if (priceObj.value !== prevPrice) {
            prevPrice = priceObj.value;
            currentPriceRank++;
            priceObj.rank = currentPriceRank;
            } else {
            priceObj.rank = currentPriceRank;
            }
        } else {
            prevPrice = priceObj.value;
            priceObj.rank = currentPriceRank;
        }
        }
    }

    function sortAndRankDurationLeaves() {
        allDurationLeaves.sort((a, b) => a.value - b.value);
        let currentDurationLeaveRank = 1;
        let prevDurationLeave = null;
        for (const [index, durationLeaveObj] of allDurationLeaves.entries()) {
        const hasPrevDurationLeave = prevDurationLeave !== NO_PRICE;
        if (hasPrevDurationLeave) {
            if (durationLeaveObj.value !== prevDurationLeave) {
            prevDurationLeave = durationLeaveObj.value;
            currentDurationLeaveRank++;
            durationLeaveObj.rank = currentDurationLeaveRank;
            } else {
            durationLeaveObj.rank = currentDurationLeaveRank;
            }
        } else {
            prevDurationLeave = durationLeaveObj.value;
            durationLeaveObj.rank = currentDurationLeaveRank;
        }
        }
    }

    function setDurationLeaveRank(record: { [key: string]: string }) {
        const id = record[ID_COLUMN];
        const price = parseFloat(record[PRICE_COLUMN]);
        let rank = -99;
        let info: Rank | undefined = undefined;
        for (const [index, durationLeaveObj] of allDurationLeaves.entries()) {
        if (durationLeaveObj.id === id) {
            info = durationLeaveObj;
            rank = durationLeaveObj.rank;
            break;
        }
        }

        if (!info) {
        throw new Error("Info not found");
        }

        durationLeaveRanks.push({ id, value: info?.value, rank });
        const found = flightRanks.find((flightRank) => {
        if (flightRank.id === id) {
            flightRank.rankDurationLeave = rank;
            return true;
        }
        return false;
        });
        if (!found) {
        flightRanks.push({
            id,
            rankRating: 0,
            rankDayLeave: 0,
            rankDayReturn: 0,
            rankPrice: 0,
            rankDurationLeave: rank,
        });
        }
    }

    // function parseDurationMs(durationString: string): any {
    //   return ms(durationString, { long: true });
    // }

    function parseDurationDayJs(durationString: string): dayjs.Dayjs {
        const matches = durationString.match(/(\d+)h (\d+)m/);

        if (!matches) {
        throw new Error("Invalid duration format: " + durationString);
        }

        const hours = parseInt(matches[1], 10);
        const minutes = parseInt(matches[2], 10);
        return createDuration().hour(hours).minute(minutes);
    }

    function setPriceRank(record: { [key: string]: string }) {
        const id = record[ID_COLUMN];
        const price = parseFloat(record[PRICE_COLUMN]);
        let rank = -99;
        for (const [index, priceObj] of allPrices.entries()) {
        if (priceObj.id === id) {
            rank = priceObj.rank;
            break;
        }
        }

        priceRanks.push({ id, value: price, rank });
        const found = flightRanks.find((flightRank) => {
        if (flightRank.id === id) {
            flightRank.rankPrice = rank;
            return true;
        }
        return false;
        });
        if (!found) {
        flightRanks.push({
            id,
            rankRating: 0,
            rankDayLeave: 0,
            rankDayReturn: 0,
            rankPrice: rank,
            rankDurationLeave: 0,
        });
        }
    }

    function setWeekDayRank(
        record: { [key: string]: string },
        column: number,
        ranks: Rank[]
    ) {
        const id = record[ID_COLUMN];
        const dayLeave = record[column];
        const rank = WeekDayRank[dayLeave as keyof typeof WeekDayRank];
        ranks.push({ id, value: dayLeave, rank });
        const isDayLeave = column === DAY_LEAVE_COLUMN;
        const isDayReturn = column === DAY_RETURN_COLUMN;
        const found = flightRanks.find((flightRank) => {
        if (flightRank.id === id) {
            if (isDayLeave) {
            flightRank.rankDayLeave = rank;
            } else if (isDayReturn) {
            flightRank.rankDayReturn = rank;
            } else {
            throw new Error("Invalid column");
            }
            return true;
        }
        return false;
        });
        if (!found) {
        flightRanks.push({
            id,
            rankRating: 0,
            rankDayLeave: isDayLeave ? rank : 0,
            rankDayReturn: isDayReturn ? rank : 0,
            rankPrice: 0,
            rankDurationLeave: 0,
        });
        }
    }

    function setRatingRank(record: { [key: string]: string }) {
        const id = record[ID_COLUMN];
        const rating = parseInt(record[RATING_COLUMN]);
        const rank = maxRating - rating + 1;

        ratingRanks.push({ id, value: rating, rank });

        const found = flightRanks.find((flightRank) => {
        if (flightRank.id === id) {
            flightRank.rankRating = rank;
            return true;
        }
        return false;
        });
        if (!found) {
        flightRanks.push({
            id,
            rankRating: rank,
            rankDayLeave: 0,
            rankDayReturn: 0,
            rankPrice: 0,
            rankDurationLeave: 0,
        });
        }
    }
    });

    parser.on("error", (error) => {
    console.error(error.message);
    });

}