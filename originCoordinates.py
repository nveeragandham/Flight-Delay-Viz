import ssl
import pandas as pd

ssl._create_default_https_context = ssl._create_unverified_context

flights_df = pd.read_csv("data/DelayedFlights.csv", usecols=["Origin"])

airports_df = pd.read_csv(
    "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat",
    header=None,
    na_values="\\N"
)

# grabbing cooresponding codes from github source 
airports_df = airports_df[[4, 6, 7]]
airports_df.columns = ["IATA", "Latitude", "Longitude"]
airports_df.dropna(subset=["IATA"], inplace=True)

# make origin, lat, long table
result_df = flights_df.merge(
    airports_df,
    left_on="Origin",
    right_on="IATA",
    how="left"
).drop(columns=["IATA"])

# output csv
result_df.to_csv("data/generatedOrigintCoordinates.csv", index=False)
print(result_df.head())
