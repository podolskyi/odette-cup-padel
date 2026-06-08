## All tournaments 

We have many tournamets, but at first we used a differend service ti run the tournament, so we need to parse it from diff formates.
https://brackets.app/~/8oJo/
https://brackets.app/~/5WmY/
https://americano-padel.com/r/822100ff-8a25-4483-b744-3ce74c4db9f314
https://americano-padel.com/r/822100ff-8a25-4483-b744-3ce74c4db9f329
https://americano-padel.com/r/822100ff-8a25-4483-b744-3ce74c4db9f365
https://americano-padel.com/r/822100ff-8a25-4483-b744-3ce74c4db9f3211
https://padelpuffin.com/mexicano/019e585d-0666-46a5-be23-22166bc3a8b4
https://americano-padel.com/r/822100ff-8a25-4483-b744-3ce74c4db9f365
https://americano-padel.com/r/822100ff-8a25-4483-b744-3ce74c4db9f358
https://brackets.app/t/BBR8x/
https://brackets.app/t/nnwR/
https://padelpuffin.com/mexicano/0198c016-1860-49ce-b39a-b679ee8b0975
https://brackets.app/t/PPxA/
https://bracketmaker.app/~/9k4Y/
https://www.padelution.com/americano/9e752512-8073-4f73-bb3f-fc5ca46d1aaf
https://padelpuffin.com/americano/01958abc-d2a8-4de2-b418-fb59276b705f
https://www.padelution.com/americano/9e5364a5-d783-43ac-a8fc-9104d0b43f1f
https://padelpuffin.com/americano/01953cbb-c59f-48e7-82d4-b7515404bf2a


## Some specification per tournament service. 

### americano-padel.com
This one is well known and we already have the parser for this, so it's okay. 

### brackets.app

Example https://brackets.app/~/8oJo/

we can get full JSON data by call the API endpoint like this https://api.bracketmaker.app/api/tournaments/8oJo
We can easy transcript the endpoind by take the ID from tournament link "8oJo" and get full JSON data. Also the extra call in similar way to get Leaderboard https://api.bracketmaker.app/api/tournaments/8oJo/standings

The JSON data ie relly self-explained.

Example final Leaderboard img-examples/brackets.app-examle.png


### padelpuffin.com

All information is on the page. I've checked the source code and there's a JSON payload with all the tournament information, so you can try to parse it. To see the final leaderboard, there's a button to show the leaderboard, but it doesn't request additional data—it just loads from the data already on the page. 

### padelution.com

All information is on the page. There is some JSON data on the page, but it seems complicated. However, everything is inside the rendered HTML, so you can parse everything from here.
